import os
import boto3
import json
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver, CORSConfig
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.typing import LambdaContext
from langchain.embeddings import BedrockEmbeddings
from langchain.vectorstores import OpenSearchVectorSearch
from opensearchpy import RequestsHttpConnection, AWSV4SignerAuth

param_values = {}
params_to_retrieve = ['relevant_documents_count']

ssm = boto3.client('ssm')

app_name = os.environ["APP_NAME"]

for param in params_to_retrieve:
    param_name = f'/opa/gen-ai/{app_name}/{param}'
    ssm_prompt_response = ssm.get_parameter(Name=param_name)
    param_value = ssm_prompt_response['Parameter']['Value']
    param_values[param] = param_value

# Constants
relevant_documents_count = int(param_values.get('relevant_documents_count'))

# Initialize Tracer for X-Ray tracing
tracer = Tracer()
# Initialize Logger for logging capabilities
logger = Logger()
# Configure CORS for API Gateway
cors_config = CORSConfig(allow_origin="*", max_age=300)

# Create an API Gateway HTTP resolver with CORS configuration
app = APIGatewayHttpResolver(cors=cors_config)

def get_aws4_auth():
    region = os.environ["REGION"]
    service = "aoss"
    session = boto3.Session(region_name=region)
    credentials = boto3.Session().get_credentials()
    return AWSV4SignerAuth(credentials, region, service)

@app.post("/api/retriever")
@tracer.capture_method
def get_relevant_documents(event):
    logger.info("Executing get_relevant_documents function")
    if "body" in event:
        body = json.loads(event['body'])
        message_text = body["message"]
        index = body["index"]
    else:
        message_text = event["message"]
        index = event["index"]
    
    print(f'message: {message_text}')
    print(f'index: {index}')

    logger.info(f"Received message: {message_text}, Index: {index}")
    index_name = index
    
    # Construct OpenSearch endpoint URL
    os_endpoint_url = os.environ["OPENSEARCH_ENDPOINT"]
    region = os.environ["REGION"]
    endpoint = os_endpoint_url.strip('[]') + ":443"

    endpoint_url =  f"https://bedrock-runtime.{region}.amazonaws.com"
    
    
    bedrock_client = boto3.client(
        "bedrock-runtime",
        endpoint_url=endpoint_url,
    )

    # Try block to handle potential errors during vector store creation
    try:
        ### Bedrock Embeddings Class Below
        embeddings = BedrockEmbeddings(client=bedrock_client)

        # Initialize OpenSearchVectorSearch with the necessary parameters selecting the index defined before in chunk size index
        vector_store = OpenSearchVectorSearch(
            index_name=index_name,
            embedding_function=embeddings,
            opensearch_url=endpoint,
            http_auth=get_aws4_auth(),
            use_ssl=True,
            verify_certs=True,
            connection_class=RequestsHttpConnection,
        )
    except Exception as e:
        # Handle exceptions and log error
        response = {
            "response": [],
            "error_explication": "Looks like we dont have Bedrock Boto3 SDK client Implemented",
            "error": "boto3 not implemented"
        }
        logger.info(response)
        return {
            "statusCode": 500,
            "body": json.dumps(response),
            "headers": {"Content-Type": "application/json"}
        }

    # Create a retriever from the vector store
    retriever = vector_store.as_retriever(search_kwargs={'k': relevant_documents_count})
    logger.info(retriever)

    # Retrieve relevant documents based on the query
    docs = retriever.get_relevant_documents(message_text)
    logger.info(docs)

    response = {
        "response": [
            {
                "page_content": doc.page_content,
                "metadata": {
                    k: v for k, v in doc.metadata.items() if k != "vector_field"
                },
            }
            for doc in docs
        ],
    }

    logger.info(response)

    return {
        "statusCode": 200,
        "body": json.dumps(response),
        "headers": {"Content-Type": "application/json"}
    }

@logger.inject_lambda_context(log_event=True, correlation_id_path=correlation_paths.API_GATEWAY_REST)
@tracer.capture_lambda_handler
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    try:
        return get_relevant_documents(event)
    except Exception as e:
        logger.error(f"Exception in lambda_handler: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"message": f"Internal Server Error: {e}"}),
            "headers": {"Content-Type": "application/json"}
        }

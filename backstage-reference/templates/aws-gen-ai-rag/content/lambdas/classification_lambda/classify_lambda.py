import os
import boto3
import json
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver, CORSConfig
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.typing import LambdaContext
from langchain.llms import Bedrock
from langchain.vectorstores import OpenSearchVectorSearch
from opensearchpy import RequestsHttpConnection

param_values = {}
params_to_retrieve = [ 'classification_prompt', 'topics', 'max_tokens_to_sample']

ssm = boto3.client('ssm')

app_name = os.environ["APP_NAME"]

for param in params_to_retrieve:
    param_name = f'/opa/gen-ai/{app_name}/{param}'
    ssm_prompt_response = ssm.get_parameter(Name=param_name)
    param_value = ssm_prompt_response['Parameter']['Value']
    param_values[param] = param_value

prompt = param_values.get('classification_prompt')
top = param_values.get('topics')
max_tokens_to_sample = int(param_values.get('max_tokens_to_sample'))

topics_str = top.strip("[]").strip()
topics = [item.strip() for item in topics_str.split(",")]

tracer = Tracer()
logger = Logger()
# CORS will match when Origin is only https://www.example.com
cors_config = CORSConfig(allow_origin="*", max_age=300)

app = APIGatewayHttpResolver(cors=cors_config)

string = """{
"topic": "topic name"
}"""

@app.post("/api/classifier")
@tracer.capture_method
def get_relevant_documents(event, context): 
    try:
        body = json.loads(event.get('body', '{}'))
        message_text = body.get("message", "")

        if "operation_mode" in body:
            operation_mode= body.get('operation_mode','inclusive')

        
        # Log message_text and other information
        logger.info(f"Received message: {message_text}")
        logger.info(f"Prompt: {prompt}")
        logger.info(f"Topics: {topics}")
        
        model_id = "anthropic.claude-instant-v1"
        bedrock_region = os.environ["REGION"]

        llm = Bedrock(
                model_id=model_id,
                region_name=bedrock_region,
                client=get_bedrock_client(),
                model_kwargs={"max_tokens_to_sample": max_tokens_to_sample}
            )
        logger.info(llm)
        
        formatted_prompt = prompt.format(question=message_text, topics=topics, string=string)
        response = llm._call(prompt=formatted_prompt)
        
        # Extract the index from the response
        index = json.loads(response)["topic"]
        
        if operation_mode == 'inclusive':
            
            logger.info("inclusive mode")

            retrieval_function = os.environ["RETRIEVAL_FUNCTION"]
            response_function = os.environ["RESPONSE_FUNCTION"]
            
            
            logger.info(f"retrieval function name: {retrieval_function}")
        
            # Call Retrieval Function
            try:
                response_documents = call_retrieval_function(retrieval_function, message_text, index)
                logger.info(f"Retrieved documents: {response_documents}")
            except Exception as e:
                logger.error(f"Error occurred during document retrieval: {e}")
                            
            # Call Response Function 
            try:
                response_answer = call_response_function(response_function, message_text, response_documents)
                logger.info(f"Answer to Q: {response_answer}")
            except Exception as e:
                logger.error(f"Error occurred during response generation: {e}")

            return {
                "statusCode": 200,
                "body": json.dumps(response_answer),
                "headers": {
                    "Content-Type": "application/json"
                }
            }


        else:
            # Create the final response including both question and index
            final_response = {
                "message": message_text,
                "index": index
            }    
            logger.info(final_response)
    
            return {
                "statusCode": 200,
                "body": json.dumps(final_response),
                "headers": {
                    "Content-Type": "application/json"
                }
            }
                
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        # Return an error response
        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Internal Server Error"}),
            "headers": {
                "Content-Type": "application/json"
            }
        }


@logger.inject_lambda_context(log_event=True, correlation_id_path=correlation_paths.API_GATEWAY_REST)
@tracer.capture_lambda_handler
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    # Extract the HTTP method from the event object
    http_method = event['httpMethod'].upper()

    # Log the HTTP method
    logger.info(f"Received HTTP method: {http_method}")

    # Route the request based on the method
    if http_method == 'POST':
        # Assuming '/api/classifier' is the correct endpoint path for REST API
        return get_relevant_documents(event, context)

    # Default response for unhandled methods
    return {"statusCode": 404, "body": json.dumps({"message": "Not found"})}

@tracer.capture_method
def get_bedrock_client():
    region_name = os.environ["REGION"]
    endpoint_url = f"https://bedrock-runtime.{region_name}.amazonaws.com"
    return boto3.client(
        "bedrock-runtime",
        region_name=region_name,
        endpoint_url=endpoint_url,
    )
    
def call_retrieval_function(retrieval_functon, message, index):
    client = boto3.client('lambda')

    body = '{"message": "' + message + '", "index": "' + index + '"}'
    logger.info(f"body: {body}")

    
    
    retrieval_response = client.invoke(
        FunctionName = retrieval_functon,
        InvocationType = 'RequestResponse',
        Payload = body
        )
        
    payload = json.loads(retrieval_response['Payload'].read())
    documents=payload["body"]
    logger.info(documents)

    return documents
    
    
def call_response_function(response_functon, message, payload):
    client = boto3.client('lambda')
  
    body = {"message": message}
    body.update(json.loads(payload))
    print(type(body))
    
    response_function_response = client.invoke(
        FunctionName = response_functon,
        InvocationType = 'RequestResponse',
        Payload = json.dumps(body)
        )
        
    answer = json.loads(response_function_response['Payload'].read())
    logger.info(answer)
    print(answer)
    
    return answer["body"]


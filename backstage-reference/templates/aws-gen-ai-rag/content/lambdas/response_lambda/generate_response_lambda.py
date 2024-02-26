# Import required modules and packages
import os
import boto3
import json
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver, CORSConfig
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.typing import LambdaContext
from langchain.llms import Bedrock

# Initialize Tracer for AWS X-Ray and Logger for logging
tracer = Tracer()
logger = Logger()

# Set CORS configuration for the API Gateway
cors_config = CORSConfig(allow_origin="*", max_age=300)

# Create an API Gateway HTTP Resolver with CORS configuration
app = APIGatewayHttpResolver(cors=cors_config)

ssm = boto3.client('ssm')

param_values = {}
params_to_retrieve = ['response_prompt', 'temperature', 'max_tokens_to_sample']

app_name = os.environ["APP_NAME"]

for param in params_to_retrieve:
    param_name = f'/opa/gen-ai/{app_name}/{param}'
    ssm_prompt_response = ssm.get_parameter(Name=param_name)
    param_value = ssm_prompt_response['Parameter']['Value']
    param_values[param] = param_value

prompt = param_values.get('response_prompt')

temperature = int(param_values.get('temperature'))

max_tokens_to_sample = int(param_values.get('max_tokens_to_sample'))

# Define a POST endpoint "/api/response"
@app.post("/api/response")
@tracer.capture_method  # Capture this method for AWS X-Ray
def get_relevant_documents(event, context):
    if "body" in event:
        query: dict = json.loads(event['body'])

        # Extract response and message text from the query
        chunks = query["response"]
        message_text = query["message"]
    else:
        message_text = event["message"]
        chunks = event["response"]
    
    logger.info(f"Chunks: {json.dumps(chunks)}")


    # Get Bedrock model ID and region from environment variables
    model_id = "anthropic.claude-instant-v1"
    bedrock_region = os.environ["REGION"]

    # Initialize the Bedrock Large Language Model (LLM) client
    llm = Bedrock(
            model_id=model_id,
            region_name=bedrock_region,
            client=get_bedrock_client(),
            model_kwargs={"max_tokens_to_sample":max_tokens_to_sample,"temperature":temperature}
        )
    # Log the Bedrock LLM client info
    logger.info(llm)
    
    # Combine chunks of documents into a single string
    full_chunks = ""
    for chunk in chunks:
        chunk = chunk["page_content"]
        full_chunks += "\n<document>\n{}\n</document>".format(chunk)

        
    logger.info(f"Full Chunks: {full_chunks}")

    
    # Format the prompt with the question and the combined documents
    formatted_prompt = prompt.format(question=message_text, documents=full_chunks)
    logger.info(f"LOGGING PROMPT: {formatted_prompt}")

    # Call the Bedrock LLM with the formatted prompt
    response = llm._call(prompt=formatted_prompt)

    # Check if the prompt is still the initial template and return a specific response
    if '{documents}' not in prompt and '{question}' not in prompt:
        response = {
                "result": response,
                "context": full_chunks,
                "error_explication": "It seems like the responses do not have proper context on them. That means the model will use their training knwoledge which and may not be accurate",
                "error": "prompt does not contain context"
                }
        logger.info(response)
        return response
        
    # Check if the prompt does not include "<document>" and return a specific response
    if "<document>" not in prompt and "<documents>" not in prompt:
        response = {
                "result": response,
                "context": full_chunks,
                "error_explication": "It looks like the prompt can be improved using best practices of Claude LLM, see how to add context to prompts -> https://docs.anthropic.com/claude/docs/constructing-a-prompt#mark-different-parts-of-the-prompt",
                "error": "prompt not optimal"
                }
        logger.info(response)
        return response

    # Prepare the final response
    response = {
        "result": response,
        "context": full_chunks
    }
    
    result = response.get("result", {}) 
    logger.info(result)
    
    # Return only the 'result' field
    return {
        "statusCode": 200,
        "body": json.dumps(result),
        "isBase64Encoded": False
    }
    
   

# Decorator to inject logging and tracing contexts into the lambda handler
@logger.inject_lambda_context(
    log_event=True, correlation_id_path=correlation_paths.API_GATEWAY_REST
)
@tracer.capture_lambda_handler
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    # Print the entire event for debugging
    print("Event:", event)
    
    # Extract the HTTP method from the event
    http_method = event.get("httpMethod", None)
    
    try:
        # Directly call the function
        return get_relevant_documents(event, context)
    except Exception as e:
        # Log the exception
        logger.error(f"An error occurred: {str(e)}")
        # You may want to customize the error response based on your requirements
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Internal Server Error"}),
            "isBase64Encoded": False
        }

# Function to get a Bedrock client using boto3
def get_bedrock_client():
    try: 
        region_name = os.environ["REGION"]
        endpoint_url = f"https://bedrock-runtime.{region_name}.amazonaws.com"
        return boto3.client(
            "bedrock-runtime",
            region_name=region_name,
            endpoint_url=endpoint_url,
        )
    except KeyError:
        # Handle the case where "REGION" environment variable is not defined
        logger.error("The 'REGION' environment variable is not defined.")
        raise
    except Exception as e:
        # Handle other potential exceptions
        logger.error(f"An error occurred while creating Bedrock client: {str(e)}")
        raise

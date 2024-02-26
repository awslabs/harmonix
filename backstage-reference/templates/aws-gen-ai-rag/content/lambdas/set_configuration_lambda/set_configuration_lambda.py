import json
import boto3
import os

def lambda_handler(event, context):
    ssm = boto3.client('ssm')

    # Define event body
    request_body = json.loads(event['body'])

    # Extract parameters from the request body
    parameters = request_body.get('parameters', {})

    app_name = os.environ["APP_NAME"]


    if parameters:
        # Update the SSM Parameters
        for key, value in parameters.items():

            parameter_name = f'/opa/gen-ai/{app_name}/{key}'

            ssm.put_parameter(
                Name=parameter_name,
                Value=str(value),
                Type='String',
                Overwrite=True
            )

        response_message = "Parameters pushed to SSM Parameter Store successfully"
        status_code = 200
    else:
        response_message = "No parameters found in the request body"
        status_code = 400


    # Send a response
    response = {
        'statusCode': status_code,
        'body': json.dumps({'message': response_message})
    }

    return response


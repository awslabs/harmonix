---
sidebar_position: 3
---

# Interacting With Your Application

To interact with the backend of the application, you need to do so in the following order:

### Prerequisites
Before interacting with your application, you will need to enable certain Bedrock models in your AWS Account. 
1. Navigate to Amazon Bedrock Service in your AWS Console. 
1. On the left-hand pane, find *Model Access* and select *Manage model access*.
1. Request access for `Amazon Titan Embeddings` and `Anthropic Claude`.

### **Step 1: Set Configuration Parameters** 
Once the application is successfully deployed, data scientists can set their custom parameters for the solution.

1. Find the link to your API in the Application's entity page on the OPA website under *Links*. Use the API Platform of your choice or the Amazon API Gateway Console to make your API request. *Be sure to add the /setConfiguration to the URI*.
2. Sample request bodies can be found in `./events/set-configuration.json`. of the application source code repo. The following parameters can be customized for your solution:

    * `response_prompt` *(string)*: Used in the **Response Lambda,** it sets up the context for the Claude model to create an answer. For proper response generation you need to format the prompt using                 `"{question}"`,  and `<document></document> XML tags:{documents} `  . This will serve as placeholders for the questions asked and the documents that will be use to answer it.  (More information can be found in [Prompt Guidelines](https://docs.aws.amazon.com/bedrock/latest/userguide/general-guidelines-for-bedrock-users.html))

    * `temperature` *(integer)*: Used in the **Response Lambda**, established the amount of randomness injected into the response. Defaults to 1. Ranges from 0 to 1. Use temp closer to 0 for analytical / multiple choice, and closer to 1 for creative and generative tasks.

    * `topics` *(string)*: Used in the **Classification Lambda**, you **must** pass a list of indices that will reflect those created in OpenSearch. These will also match the high-level folder structure that you created in you S3 Data Bucket. For example: [ “apple”, “google”, “tesla”]. See [Step 2: Upload Contextual Documents](#context) for more information.

    * `max_tokens_to_sample` *(integer)*: Used in the **Response Lambda,** the maximum number of tokens to generate before stopping. We recommend a limit of 4,000 tokens for optimal performance. Note that Anthropic Claude models might stop generating tokens before reaching the set value.

    * `chunk_size` *(integer)*: Used in **Index Lambda,** it sets the maximum number of characters in each chunk of text after splitting. This parameter must be set before documents are indexed. If modified after indexing, the documents will need to be re-indexed. 

    * `chunk_overlap` *(integer)*:  Used in **Index Lambda,** determines the amount of overlap between consecutive text chunks, allowing you to control the continuity of context in the generated segments during the splitting process. This parameter must be set before documents are indexed. If modified after indexing, the documents will need to be re-indexed. 

    * `relevant_document_count` *(integer)*: Used in the **Retrieval Lambda,** it will determine the max number of documents to be retrieved from OpenSearch.

> NOTE: Parameter values are configured with default values at the time of resource deployment. All parameters can be used in their default state EXCEPT for `topics`. This parameter must be configured to meet the requirements specified above and in [Step 2: Upload Contextual Documents](#context).


### Step 2: Upload Contextual Documents {#context}
Once your parameters are set, upload relevant documents to the S3 Data Bucket.

1. **Find the name of your DATA BUCKET**. This bucket can be found on the Entity Page of your application, under AWS Infrastructure Resources, listed as an S3 bucket.

2. **Create folders inside the bucket corresponding to the names you want your indices to have.** This should be something relevant to the documents that will be included in them. For example, a folder labeled “amazon” will contain only documents written about Amazon. These  folders will match the list of *topics* you set in your parameters. 

3. **Upload your files to their respective folder**. This must be a .txt file. 

4. **Wait for your indices to be created.** Adding an object to your bucket will trigger the **Indexer Lambda** function. You can track the progress of this in the Indexer Lambda’s CloudWatch Logs or verify that the number of indices in OpenSearch increased. Depending on the number and size of the files you upload, this process will take around 1-3 min. 



### Step 3: Testing [OPTIONAL] {#classification}
Once the parameters are set and the documents are uploaded, you are ready to begin asking questions and testing your solution.

> NOTE: Each Lambda function is fronted by its own API method. However, the Classification Lambda has the ability to call the Retriever and Response, which will ultimately return to you your final answer with just one API call. You can control this feature through the `/classification` API call.

If `operation_mode` = 
* `inclusive`, then the Classifier will call the Retriever and Response and return the **final message**.
* `exclusive`, the request will only hit the Classifier and return the `message` and `index` fields. *Use this for isolated testing*.


**/classification** 
```json
{
    "message": "Ask your question to the Chatbot here!",
    "operation_mode": "exclusive"
}
```

The response from the /classification will be used as the request for your /retrieval The input will look something like this:

**/retrieval**
```json
{
    "message": "The same question used in the request above will be used here.",
    "index": "An index from your OpenSearch Collection"
}
```

The response from the /retrieval will be used as the request for your /response. The input will look something like this:

**/response**
```json
{
    "message": "The same question used in the request above will be used here.",
    "response": [
            {
                "page_content": "An extensive string containing relevant document context..."
            }
    ]
}
```

The response from the /response will be a string containing the **final answer** to your initial question.


> These events can also be found in the `./events` folder of your application's source code repository.


### Step 4: Asking the ChatBot a Question
Now your end users are ready to ask a question. Simply make an API call to the Classfication API method using the request format illustrated in the [Step 3: Testing /classification](#classification) section above. This sample event can also be found in `./events/classification`:


**/classification** 
```json
{
    "message": "Ask your question to the Chatbot here!",
    "operation_mode": "inclusive"
}
```
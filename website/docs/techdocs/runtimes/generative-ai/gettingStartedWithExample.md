---
sidebar_position: 4
---

# Getting Started With An Example

In this section, we will walk you through the steps to create a Chatbot purposefully built for asking questions about major technology companies. 

### Prerequisites
Please follow the instructions highlighted in the [Deploying Your Application](deployingYourApp.md) page. Once you have successfully deployed your application resources, you may proceed with the following steps.

### Step 1: Set Configuration Parameters

Our first step after deploying the resources for our application is to customize the configurations. As part of the deployment process, default values are set for all of the customizable parameters. The default values are as follows:


* `response_prompt`: "Use the following documents to answer the following `{question}`. Here are the documents, between `<document></document>` XML tags: `{documents}` Do not directly mention the content of the documents if not relevant to the question. Ensure that your answer is accurate and uses the information from the documents previously provided."

* `temperature` : 1

* `topics` : [ ]         *(this is currently an empty array that we will modify in Step 2)*

* `max_tokens_to_sample` : 400

* `chunk_size` : 28000

* `chunk_overlap` : 0

* `relevant_document_count` : 3

> For more details on parameter descriptions and requirements, and how to make an API request please see the **Step 1: Set Configuration Parameters** section on the [Interacting With Your Application](interactingWithApp.md) page.

For our use case, we will start by modifying the `topics` parameter. Make the following request to the `/setConfiguration` method of your API:
```json
{
    "parameters": {
        "topics": "['amazon', 'google', 'meta', 'apple']",
    }
}
```
These represent the high level topics that we will be using to organize, classify and store our indexed data by. 

### Step 2: Upload Contextual Documents 

These topics now need to be reflected in our data source's file structure. Locate the sample documents in the source code of your application repo: `./sample-files`

Navigate to your **S3 Data Bucket** and upload these folders and files. The S3 data structure should be as follows:

```
    Your Data Bucket
    │
    ├───amazon/
    │ └───Amazon Annual Report 2022.txt
    │
    ├───google/
    │ └───Google Annual Report 2022.txt
    |
    ├───meta/
    │ └───Meta Annual Report 2022.txt
    |
    └───apple/
      └───Apple Annual Report 2022.txt
```

Adding these documents is triggering the **Indexer Lambda Function**, which will be creating and storing the indexes in **Amazon OpenSearch Service** according to the parameters we set in Step 1. This process will take a couple of minutes. To validate completion, see the Indexer Lambda Function's CloudWatch Logs or navigate to your OpenSearch Collection and  verify that `4` indexes have been created. 

> NOTE: Adding more files under the same folders won't modify the index name, but it will enrich the data. 


### Step 3: Ask your Chatbot a Question

At this point, your chatbot has a couple of SEC documents providing additional context to the LLM. Let's ask a question!

Make a request to the `/classification` method of our API, for example:
```json
{
    "message": "What was the 2022 revenue of Amazon?",
    "operation_mode": "inclusive"
}
```

```json
{
    "message": "Who is Google's CEO?",
    "operation_mode": "inclusive"
}
```

```json
{
    "message": "What is Meta?",
    "operation_mode": "inclusive"
}
```
Your response should be a contextual answer to your question! 

### Step 4: Experiment!

Now that we have confirmed that your Chatbot is up and running, we encourage you to experiment. Ask different questions, modify your parameters, add more files, etc.


> NOTE: If you want to modify `chunk_size` or `chunk_overlap` at this point, you will have to create new indices with a different name or delete the previous ones; followed by modifying your `topics` parameter. For more information see **Step 1: Set Configuration Parameters** on the [Interacting With Your Application](interactingWithApp.md) page.


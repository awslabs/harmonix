---
sidebar_position: 3
---

# Create Resources

To create shared resources that can be use by your application, we first need to provision a resource.

## Creating an RDS Database resource

**1.**  On the OPA on AWS website, navigate to the Create... menu. Search and choose AWS RDS Database.

![alt text](/img/docs/create-resources-1.png)

**2.**  Provide resource information and select Next Step


| Parameter | Value  | Description |
| :- | :- | :- |
| **Name** |```payment-db``` | A unique identifier for the database |
| **Description** |```A database for payment transactions``` | Describes what the database's purpose will be |
| **Owner** | Select 'developer' | The group or user that will be responsible for the entity |

![alt text](/img/docs/create-resources-2.png)

**3.** Provide deployment information for the resource and select **Next Step**

| Parameter | Value  | Description |
| :- | :- | :- |
| **AWS Environment** | *the **dev-environment** will be pre-selected since it is the only environment available* | The AWS Environment in which you want to deploy your application to. The environment that we created in the previous step will already be selected for you |

![alt text](/img/docs/create-resources-3.png)

**4.**  Provide database configuration and select **Next Step**

| Parameter | Value  | Description |
| :- | :- | :- |
| **Database Name** |```paymentsdb``` | The name of a default database to create in the RDS instance |
| **Object Name** |```user``` | The name of the object that you will track in the default database. |
| **Database Engine** | Select 'PostgreSQL' | The engine of the SQL database |
| **Database Size** | Select 'Small (20GB)' | The size of the database that will be deployed |

![alt text](/img/docs/create-resources-4.png)

**5.** Provide Repository information and select **Next Step**
Choose a repository for this database IAC source and entity information - you can use ```payments-db```

**6.** Create the database

![alt text](/img/docs/create-resources-5.png)

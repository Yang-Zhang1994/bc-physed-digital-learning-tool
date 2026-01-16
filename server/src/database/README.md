This folder contains mock JSON data for importing into MongoDB for the BC phys-ed digital learning tool.

Files:
- `modules.json` — module documents (moduleID, moduleName, levelID)
- `gameLevels.json` — game level documents (levelID, dialogID, coin, exp, questionID)
- `dialogues.json` — dialogue documents (dialogID, content[])
- `questions.json` — question documents (questionID, problem, type, options, answer)
- `users.json` — sample user documents

Import example (PowerShell):

Replace <DB_URI> with your MongoDB connection string and <DB_NAME> with the database name you want to use.

mongoimport --uri "<DB_URI>" --db <DB_NAME> --collection modules --file modules.json --jsonArray
mongoimport --uri "<DB_URI>" --db <DB_NAME> --collection gamelevels --file gameLevels.json --jsonArray
mongoimport --uri "<DB_URI>" --db <DB_NAME> --collection dialogues --file dialogues.json --jsonArray
mongoimport --uri "<DB_URI>" --db <DB_NAME> --collection questions --file questions.json --jsonArray
mongoimport --uri "<DB_URI>" --db <DB_NAME> --collection users --file users.json --jsonArray

Notes:
- The mock data uses simple string IDs for moduleID, questionID and dialogID to keep the import straightforward. You can later convert these to ObjectId references or run scripts to link documents.
- If your MongoDB requires authentication or a specific replica set / TLS options, include those in the --uri connection string.

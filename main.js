const { nanoid } = require('fix-esm').require('nanoid');
class Account {
    #anime_list

    constructor(email, password) {
        this.email = email
        this.password = password
        this.serial = Math.floor(Math.random() * Date.now()) + nanoid()
        this.#anime_list = []
        this.hashed = ""
    }

    get anime_list () {
        return this.#anime_list
   }

} 


const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, 'templates/.env') }) 

const uri = process.env.MONGO_CONNECTION_STRING;

/* Our database and collection */
const databaseAndCollection = {db: "CMSC335DB", collection:"AnimeAccounts"};
const { MongoClient } = require('mongodb');

const express = require("express");
const app = express();
app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname, "templates"));
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded data
app.engine('ejs', require('ejs').renderFile);

const port = process.argv[2]
const bcrypt = require("bcrypt");

/* Important */
process.stdin.setEncoding("utf8");

if (process.argv.length != 3) {
    process.stdout.write("Please enter port number next time");
    process.exit(1);
}

const prompt = "Stop to shutdown server: ";
console.log(`Webserver started and running at http://localhost:${port}`);

process.stdout.write(prompt);
process.stdin.on("readable", async function () {

    const dataInput = process.stdin.read();

    if (dataInput !== null) {
        const command = dataInput.trim();

        if (command === "stop") {
            process.stdout.write("Shutting down the server\n");
            await mongodb.close();
            process.exit(0);
        }

        else {
            console.log(`Invalid Prompt: ${command}`)
        }
        process.stdout.write(prompt);
        process.stdin.resume();
    }

});

const mongodb = new MongoClient(uri);

async function submitToServer(newApp) {
    try{
        await mongodb.connect()
        console.log("submitting the application")
        
        //putting application into the correct collection
        await mongodb.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newApp);

    }catch (e) {
        console.error(e)
    }
}

let currentAccount;

// Serve the main page
app.get("/", (req, res) => {
    res.render("login");
});


app.post("/", async (req, res) => {
    const email_account= req.body.email;
    const entered_password = req.body.password1;
    const currentQuery = await lookUpOneEntry(mongodb, databaseAndCollection, email_account)
    currentAccount = currentQuery.accountInfo
    console.log(currentAccount.anime_list)

    if (currentAccount && verifyPassword(entered_password, currentAccount.hashed)) {
        const numMedia = currentAccount.anime_list.length
        // If the login is successful, redirect to the account page
        res.render("account");
    } else {
        // If the credentials are incorrect, send an error or redirect back to the login page
        res.render("login");  // Or send an error message
    }
})


app.get("/create", (req, res) => {
    res.render("create")
})

app.post("/create", async (req, res) => {

    const email_account= req.body.email;
    const password1 = req.body.password1;    
    const hashed = getHashedPassword(password1);
    const accountInfo = new Account(email_account, password1)
    accountInfo.hashed = hashed

    let newQuery = {accountInfo, "email" : email_account}
    try {
        await submitToServer(newQuery);
        res.redirect("/"); // Redirect after creating an account
    }
    catch(e) {
        console.error(e)
    }
})

app.get("/account", async (req, res) => {
    // Render the account page with the current anime list
    res.render("account");
})

app.get("/search", (req, res) => {
    res.render("search")
})


app.post("/search", async (req, res) => {
    const selectedAnimeData = req.body;
    const selectedAnime = Object.values(selectedAnimeData);
    selectedAnime.forEach(animeData => {
        const anime = animeData; // Assuming animeData is already in the correct format
        console.log(currentAccount)
        console.log(currentAccount.anime_list)
        if (!currentAccount.anime_list.some(existingAnime => existingAnime.title === anime.title)) {
            currentAccount.anime_list.push(anime);
        }
    });

    await updateOne(mongodb, databaseAndCollection, currentAccount.email, currentAccount.anime_list);
    res.render("account", { myanimeList: currentAccount.anime_list });
});


async function lookUpOneEntry(client, databaseAndCollection, emailName) {
    let filter = {email: emailName};
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);

   if (result) {
       return result;
   } else {
       console.log(`No account found with name ${movieName}`);
       return null;
   }
}

async function updateOne(client, databaseAndCollection, targetName, newValues) {
    let filter = {email : targetName};
    let update = { $set: newValues };

    const result = await client.db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .updateOne(filter, update);

    console.log(`Documents modified: ${result.modifiedCount}`);
}

const getHashedPassword = (password, saltRounds) => {
    const salt = bcrypt.genSaltSync(saltRounds); /* If we don't specify it, the default is 10 */
    return bcrypt.hashSync(password, salt); 
}

const verifyPassword = (password, hashed) => {
    return bcrypt.compareSync(password, hashed);
}


app.listen(port)

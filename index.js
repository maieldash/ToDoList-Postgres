import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import moment from "moment";

const app = express();
const port = 3000;
var lastListId = 2;
var today;
var curListTitle = "";

const db = new pg.Client({
    host: "localhost",
    user: "postgres",
    password: "123456@",
    database: "toDoList",
    port: 5432
});
db.connect();

function setCurDate(req,res,next) {
    today = moment().format('YYYY-MM-DDThh:mm'); 
    next();
}

async function updateListTitles() {
    let result = await db.query("select title from lists");
    let listsTitles = [];
    result.rows.forEach((row) => {
        listsTitles.push(row.title);
    })
    return listsTitles;
}

async function createNewList(title) {
    try {
        let result = await db.query("insert into lists(title) values ($1) returning id", [title]);
        lastListId = result.rows[0].id;
    } catch (error) {
        console.log("list already exist " + title);
        return;
    }
    console.log("new list create with id" + lastListId);
}

async function createNewTask(title, deadline, description, priority, listId) {
    var date = moment(deadline).format('YYYY-MM-DDThh:mm');
    console.log(date);
    console.log(date.slice(0,4));
    console.log(today);
    console.log(today.slice(5,7));
    if (listId != "none") {
        try {
            let result = await db.query("insert into tasks(title, deadline, description, priority, list_id) values ($1,$2,$3,$4,$5) returning id", [title, date, description, priority, parseInt(listId)]);
            console.log("new task create with id" + result.rows[0].id);
        } catch (error) {
            console.log("task already exist ");
            return;
        }
    }
    if(date.slice(0,4) === today.slice(0,4) &&
    date.slice(5,7) === today.slice(5,7) &&
        date.slice(8,10) === today.slice(8,10)) {
        try { // add to today list tasks
            
                let result = await db.query("insert into tasks(title, deadline, description, priority, list_id) values ($1,$2,$3,$4,$5) returning id", [title, date, description, priority, 1]);
                console.log("added to today list task num " + result.rows[0].id);
                listId = 1;
            } catch (error) {
                console.log("task already exist in today list ");
                return;
            }
    }
    else {
        try { // add to upcoming list tasks
            
            let result = await db.query("insert into tasks(title, deadline, description, priority, list_id) values ($1,$2,$3,$4,$5) returning id", [title, date, description, priority, 2]);
            console.log("added to upcoming list task num " + result.rows[0].id);
            listId = 2;
        } catch (error) {
            console.log("task already exist in upcoming ");
            return;
        }
    }
    return listId;
}

async function showSelectedList(listId) {
    var result = await db.query("select * from tasks where list_id = $1", [listId]);
    var allTasks = [];
    console.log(result.rows);
    result.rows.forEach((task) => {
        allTasks.push(task);
    });
    
    console.log("all Tasks returned are ");
    console.log(allTasks);
    return allTasks;
}
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(setCurDate);
app.listen(port, () => {
    console.log("server is listening to port " + port);
});
var selectedList = [];

async function renderHomePage(res) {
    let listsTitles = await updateListTitles();
    console.log(today.slice(11, 16));
    res.render("index.ejs", {
        "listsTitles": listsTitles,
        "selectedList": selectedList,
        "today": today,
        "curListTitle":curListTitle
    })
}

app.get("/", (req, res) => {
    console.log("Show Default list of today ");
    res.redirect("/today");
});
app.get("/today", async (req, res) => {
    console.log("show today list tasks ");
    selectedList = await showSelectedList(1); // 1 is the id of today list
    curListTitle = "";
    renderHomePage(res);
});
app.get("/upcoming",async (req, res) => {
    console.log("show upcoming list");
    selectedList = await showSelectedList(2);// 2 is the id of the upcoming list
    curListTitle = "Upcoming";
    renderHomePage(res);
});
app.get("/list", async (req, res) => {
    const listId = req.query.list;
    console.log("list sent is " + listId);
    if (listId == 1) {
        res.redirect("/today");
        return;
    }
    else if (listId == 2) {
        res.redirect("/upcoming");
        return;
    } 
    selectedList = await showSelectedList(listId);
    let result = await db.query("select title from lists where id = $1", [listId]);
    curListTitle = result.rows[0].title;
    renderHomePage(res);
});
app.post("/addList", async (req, res) => {
    console.log("new request to create list " + req.body["list-title"]);
    await createNewList(req.body["list-title"]);
    res.redirect(`/list?list=${lastListId}`);
});
app.post("/addTask", async (req, res) => {
    console.log("new task created " + req.body["task-title"]);
    let list = await createNewTask(req.body["task-title"], req.body["task-dateTime"], req.body["task-description"], req.body["task-priority"], req.body["task-list"]);

    if (req.body["task-list"] === "none") {
        res.redirect(`/${list}`);
    }
    else {
        res.redirect(`/list?list=${req.body['task-list']}`);
    }
    
});
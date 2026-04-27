import express from "express";
import Database from "better-sqlite3";
import session from "express-session";

const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
    secret: "secret",
    resave: false,
    saveUninitialized: false
}));

// database
const db = new Database("quotes.db");

// create tables
db.exec(`
    create table if not exists users (
        id integer primary key autoincrement,
        username text unique,
        password text
    );

    create table if not exists authors (
        authorId integer primary key autoincrement,
        firstName text,
        lastName text
    );

    create table if not exists quotes (
        quoteId integer primary key autoincrement,
        quote text,
        authorId integer,
        category text
    );
`);

// reset login (simple for assignment)
db.prepare("delete from users").run();
db.prepare("insert into users (username, password) values (?, ?)")
  .run("admin", "s3cr3t");

// check login
function checkLogin(req, res, next) {
    if (req.session.loggedIn) next();
    else res.redirect("/login");
}

// routes
app.get("/", (req, res) => {
    res.redirect("/login");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    let rows = db.prepare(
        "select * from users where username=? and password=?"
    ).all(req.body.username, req.body.password);

    if (rows.length > 0) {
        req.session.loggedIn = true;
        res.redirect("/authors");
    } else {
        res.send("wrong login");
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

// authors page
app.get("/authors", checkLogin, (req, res) => {
    let authors = db.prepare("select * from authors").all();
    res.render("authors", { authors });
});

// add author
app.get("/addAuthor", checkLogin, (req, res) => {
    res.render("addAuthor");
});

app.post("/addAuthor", checkLogin, (req, res) => {
    let { firstName, lastName } = req.body;

    db.prepare(
        "insert into authors (firstName, lastName) values (?, ?)"
    ).run(firstName, lastName);

    res.redirect("/authors");
});

// delete author
app.get("/deleteAuthor", checkLogin, (req, res) => {
    let id = req.query.authorId;

    db.prepare("delete from authors where authorId=?").run(id);
    res.redirect("/authors");
});

// quotes page
app.get("/quotes", checkLogin, (req, res) => {
    let quotes = db.prepare(`
        select q.quoteId, q.quote, q.category,
               a.firstName, a.lastName
        from quotes q
        join authors a on q.authorId = a.authorId
    `).all();

    res.render("quotes", { quotes });
});

// add quote
app.get("/addQuote", checkLogin, (req, res) => {
    let authors = db.prepare("select * from authors").all();
    res.render("addQuote", { authors });
});

app.post("/addQuote", checkLogin, (req, res) => {
    let { quote, authorId, category } = req.body;

    db.prepare(
        "insert into quotes (quote, authorId, category) values (?, ?, ?)"
    ).run(quote, authorId, category);

    res.redirect("/quotes");
});

// delete quote
app.get("/deleteQuote", checkLogin, (req, res) => {
    let id = req.query.quoteId;

    db.prepare("delete from quotes where quoteId=?").run(id);
    res.redirect("/quotes");
});

// important for render
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("server running");
});
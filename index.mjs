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

const db = new Database("quotes.db");

db.exec(`
    create table if not exists users (
        id integer primary key autoincrement,
        username text unique,
        password text
    );
`);

db.prepare("delete from users").run();
db.prepare("insert into users (username, password) values (?, ?)").run("admin", "s3cr3t");

function checkLogin(req, res, next) {
    if (req.session.loggedIn) next();
    else res.redirect("/login");
}

app.get("/", (req, res) => res.redirect("/login"));

app.get("/login", (req, res) => res.render("login"));

app.post("/login", (req, res) => {
    let rows = db.prepare("select * from users where username=? and password=?")
        .all(req.body.username, req.body.password);

    if (rows.length > 0) {
        req.session.loggedIn = true;
        res.redirect("/authors");
    } else {
        res.send("wrong login");
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
});

app.get("/authors", checkLogin, (req, res) => {
    let authors = [];
    res.render("authors", { authors });
});

app.listen(process.env.PORT || 3000);

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const methodOverride = require('method-override'); 
const Product = require('./models/product');
const passport = require('passport');
const session = require('express-session');
const authRoutes = require('./routes/auth');
const User = require('./models/user');

const app = express();

mongoose.connect('mongodb://localhost:27017/mydatabase', {
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Could not connect to MongoDB', err);
});

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(bodyParser.json());

app.use(
    session({
      secret: 'secret',
      resave: false,
      saveUninitialized: true,
    })
);

app.use(passport.initialize());
app.use(passport.session());
app.use('/auth', authRoutes);



app.get('/products', async (req, res) => {
    let username = 'Nieznajomy';
    if (req.session.user) {
        username = req.session.user;
    }

    const products = await Product.find();
    res.render('index', { products, username });
});

// Dodawanie 
app.post('/products', async (req, res) => {
    try {
        const { name, price, description, quantity, unit } = req.body;

        const existingProduct = await Product.findOne({ name });
        if (existingProduct) {
            return res.status(400).json({ error: 'Product with this name already exists' });
        }

        const product = new Product({ name, price, description, quantity, unit });
        await product.save();
        res.redirect('/products');
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.redirect('/products');
});

// Edytowanie 
app.put('/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, description, quantity, unit } = req.body;
        const product = await Product.findByIdAndUpdate(id, { name, price, description, quantity, unit }, { new: true, runValidators: true });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        if (!req.session.user) {
            return res.status(400).json({ error: 'Only authorized users can edit and delete products' });
        }
        res.redirect('/products');
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Usuwanie 
app.delete('/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByIdAndDelete(id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        if (!req.session.user) {
            return res.status(400).json({ error: 'Only authorized users can edit and delete products' });
        }
        res.redirect('/products');
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//sortowanie
app.post('/sortP', async (req, res) => {
    const sortBy = req.body.sortBy;
    let username = 'Nieznajomy';
    if (req.session.user) {
        username = req.session.user;
    }
    let sortedProducts = await Product.find();
    if (sortBy === 'name') {
      sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'price') {
      sortedProducts.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'quantity') {
        sortedProducts.sort((a, b) => a.quantity - b.quantity);
    }
    res.render('index', { products: sortedProducts, username });
  });

//filtrowanie
  app.post('/filterByPrice', async (req, res) => {
    const maxPrice = parseInt(req.body.maxPrice);
    let username = 'Nieznajomy';
    if (req.session.user) {
        username = req.session.user;
    }
    let productsData = await Product.find();
    const filteredProducts = productsData.filter(
      (product) => product.price <= maxPrice
    );
    res.render('index', { products: filteredProducts, username });
  });
  

// raport
app.get('/report', async (req, res) => {
    try {
        const report = await Product.aggregate([
            {
                $project: {
                    _id: 0,
                    name: 1,
                    quantity: 1,
                    totalValue: { $multiply: ["$price", "$quantity"] }
                }
            }
        ]);
        //res.json(report);
        res.render('report', { report });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        const existinguser = await User.findOne({ username });
        if (existinguser) {
            return res.status(400).json({ error: 'Username taken' });
        }

        const user = new User({ username, password });
        await user.save();
        res.redirect('/');
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(400).json({ message: 'Invalid username or password' });

        req.logIn(user, (err) => {
            if (err) return next(err);
            const { username } = req.body;
            req.session.user = username;
            res.redirect('/');
        });
    })(req, res, next);
});

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out', error: err.message });
        }
        res.redirect('/');
    });
});


app.get('/login', (req, res) => {
    res.render('login');
  });
  
  app.get('/register', (req, res) => {
    res.render('register');
  });

const PORT = 3000;
const HOST = '192.168.0.239';

const port = process.env.PORT || 3000;
app.listen(PORT, HOST, () => {
    console.log(`Listening on port http://${HOST}:${port}/`);
});

import Home from './pages/Home';
import Shop from './pages/Shop';
import Categories from './pages/Categories';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderTracking from './pages/OrderTracking';
import Chat from './pages/Chat';
import About from './pages/About';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Shop": Shop,
    "Categories": Categories,
    "ProductDetail": ProductDetail,
    "Cart": Cart,
    "Checkout": Checkout,
    "Orders": Orders,
    "OrderTracking": OrderTracking,
    "Chat": Chat,
    "About": About,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
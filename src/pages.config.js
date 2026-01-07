import About from './pages/About';
import Cart from './pages/Cart';
import Categories from './pages/Categories';
import Chat from './pages/Chat';
import Checkout from './pages/Checkout';
import Home from './pages/Home';
import OrderTracking from './pages/OrderTracking';
import Orders from './pages/Orders';
import ProductDetail from './pages/ProductDetail';
import Settings from './pages/Settings';
import Shop from './pages/Shop';
import AdminPayments from './pages/AdminPayments';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "Cart": Cart,
    "Categories": Categories,
    "Chat": Chat,
    "Checkout": Checkout,
    "Home": Home,
    "OrderTracking": OrderTracking,
    "Orders": Orders,
    "ProductDetail": ProductDetail,
    "Settings": Settings,
    "Shop": Shop,
    "AdminPayments": AdminPayments,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
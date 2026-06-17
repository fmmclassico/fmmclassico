/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 */
import About from './pages/About';
import AdminBanners from './pages/AdminBanners';
import AdminBroadcast from './pages/AdminBroadcast';
import AdminInvoice from './pages/AdminInvoice';
import AdminMessages from './pages/AdminMessages';
import AdminOrders from './pages/AdminOrders';
import AdminSMSBroadcast from './pages/AdminSMSBroadcast';
import Cart from './pages/Cart';
import Categories from './pages/Categories';
import Chat from './pages/Chat';
import Checkout from './pages/Checkout';
import Feedback from './pages/Feedback';
import Home from './pages/Home';
import HowToUse from './pages/HowToUse';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Notifications from './pages/Notifications';
import OrderTracking from './pages/OrderTracking';
import Orders from './pages/Orders';
import Payment from './pages/Payment';
import PaymentConfirmed from './pages/PaymentConfirmed';
import ProductDetail from './pages/ProductDetail';
import Settings from './pages/Settings';
import Shop from './pages/Shop';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "AdminBanners": AdminBanners,
    "AdminBroadcast": AdminBroadcast,
    "AdminInvoice": AdminInvoice,
    "AdminMessages": AdminMessages,
    "AdminOrders": AdminOrders,
    "AdminSMSBroadcast": AdminSMSBroadcast,
    "Cart": Cart,
    "Categories": Categories,
    "Chat": Chat,
    "Checkout": Checkout,
    "Feedback": Feedback,
    "Home": Home,
    "HowToUse": HowToUse,
    "Login": Login,
    "Register": Register,
    "ForgotPassword": ForgotPassword,
    "ResetPassword": ResetPassword,
    "Notifications": Notifications,
    "OrderTracking": OrderTracking,
    "Orders": Orders,
    "Payment": Payment,
    "PaymentConfirmed": PaymentConfirmed,
    "ProductDetail": ProductDetail,
    "Settings": Settings,
    "Shop": Shop,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
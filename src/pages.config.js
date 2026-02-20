/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import About from './pages/About';
import AdminMessages from './pages/AdminMessages';
import AdminOrders from './pages/AdminOrders';
import Cart from './pages/Cart';
import Categories from './pages/Categories';
import Chat from './pages/Chat';
import Checkout from './pages/Checkout';
import Feedback from './pages/Feedback';
import Home from './pages/Home';
import Notifications from './pages/Notifications';
import OrderTracking from './pages/OrderTracking';
import Orders from './pages/Orders';
import ProductDetail from './pages/ProductDetail';
import Settings from './pages/Settings';
import Shop from './pages/Shop';
import Payment from './pages/Payment';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "AdminMessages": AdminMessages,
    "AdminOrders": AdminOrders,
    "Cart": Cart,
    "Categories": Categories,
    "Chat": Chat,
    "Checkout": Checkout,
    "Feedback": Feedback,
    "Home": Home,
    "Notifications": Notifications,
    "OrderTracking": OrderTracking,
    "Orders": Orders,
    "ProductDetail": ProductDetail,
    "Settings": Settings,
    "Shop": Shop,
    "Payment": Payment,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
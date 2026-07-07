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
import Notifications from './pages/Notifications';
import OrderTracking from './pages/OrderTracking';
import Orders from './pages/Orders';
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
  "Notifications": Notifications,
  "OrderTracking": OrderTracking,
  "Orders": Orders,
  "Product": ProductDetail,
  "ProductDetail": ProductDetail,
  "Settings": Settings,
  "Shop": Shop,
}

export const pagesConfig = {
  mainPage: "Home",
  Pages: PAGES,
  Layout: __Layout,
};

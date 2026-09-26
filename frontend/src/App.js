import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import Layout from './components/layout/Layout';

// Redesigned Modern Pages
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import SegmentPage from './pages/SegmentPage';
import KidsPage from './pages/KidsPage';
import TeensPage from './pages/TeensPage';
import MenPage from './pages/MenPage';
import WomenPage from './pages/WomenPage';
import UnisexPage from './pages/UnisexPage';
import ProductDetailPage from './pages/ProductDetailPage';
import VisualSearchPage from './pages/VisualSearchPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PreferencePage from './pages/PreferencePage';

// Import Design System & Global Styles
import './styles/tokens.css';
import './styles/global.css';

const AppContent = () => {
  const { page, params } = useNavigation();

  const renderCurrentPage = () => {
    switch (page) {
      case 'home':
        return <HomePage />;

      case 'products':
        return <ProductsPage />;

      case 'trending':
        return <ProductsPage />;

      case 'search':
        return <ProductsPage />;

      case 'segment':
        return <SegmentPage segmentName={params.segment ? params.segment.toUpperCase() : 'Eco'} defaultFilters={{ gender_category: params.segment }} />;

      case 'kids':
        return <KidsPage />;

      case 'teens':
        return <TeensPage />;

      case 'men':
        return <MenPage />;

      case 'women':
        return <WomenPage />;

      case 'unisex':
        return <UnisexPage />;

      case 'product-detail':
        return <ProductDetailPage productId={params.id} />;

      case 'visual-search':
        return <VisualSearchPage />;

      case 'cart':
        return <CartPage />;

      case 'checkout':
        return <CheckoutPage />;

      case 'profile':
        return <ProfilePage />;

      case 'login':
        return <LoginPage />;

      case 'signup':
        return <SignupPage />;

      case 'preferences':
        return <PreferencePage />;

      default:
        if (page && (page.startsWith('product-') || page.startsWith('product/'))) {
          const id = page.replace(/^product[-/]/, '');
          return <ProductDetailPage productId={id} />;
        }
        return <HomePage />;
    }
  };

  return (
    <Layout>
      {renderCurrentPage()}
    </Layout>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <NavigationProvider>
            <AppContent />
          </NavigationProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, Leaf, ShieldCheck, Tag, ShoppingBag, Truck, RotateCcw, Star, TrendingUp } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import './HeroCarousel.css';

export const HeroCarousel = () => {
  const { navigateTo } = useNavigation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  const slides = [
    {
      id: 1,
      themeClass: 'hero-slide-theme-emerald',
      badge: 'Mega Sustainable Carnival | Up to 40% OFF',
      badgeIcon: <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />,
      title: (
        <>
          Make Every Purchase <br />
          <span className="highlight">More Sustainable.</span>
        </>
      ),
      subtext: 'Discover certified organic cotton wear, biodegradable daily home essentials, and natural bamboo kitchenware.',
      highlights: [
        { icon: <Leaf size={13} />, text: '100% Certified Organic' },
        { icon: <Truck size={13} />, text: 'Free Delivery > ₹499' },
      ],
      ctaText: 'Explore Collection',
      ctaAction: () => navigateTo('products'),
      secondaryText: 'Try Visual AI Search',
      secondaryAction: () => navigateTo('visual-search'),
      visualTitle: 'Organic Cotton Overshirt',
      visualCategory: 'Verified Eco Pick',
      visualImg: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
      badge1Icon: <Leaf size={12} aria-hidden="true" />,
      badge1Text: '94% Eco Score',
      badge2Icon: <Tag size={12} aria-hidden="true" />,
      badge2Text: '40% OFF',
    },
    {
      id: 2,
      themeClass: 'hero-slide-theme-teal',
      badge: 'Zero Plastic Living Collection',
      badgeIcon: <Leaf size={14} style={{ color: 'var(--color-secondary)' }} />,
      title: (
        <>
          Zero-Waste Living <br />
          <span className="highlight">Starts at Home.</span>
        </>
      ),
      subtext: 'Ditch single-use plastics with durable insulated stainless steel, borosilicate glass, and plant-based home storage.',
      highlights: [
        { icon: <ShieldCheck size={13} />, text: 'Plastic-Free Guarantee' },
        { icon: <Tag size={13} />, text: 'Deals Under ₹999' },
      ],
      ctaText: 'Shop Zero-Waste',
      ctaAction: () => navigateTo('products', { category: 'Home & Living' }),
      secondaryText: 'Trending Items',
      secondaryAction: () => navigateTo('trending'),
      visualTitle: 'Recycled Glass Carafe',
      visualCategory: 'Zero Plastic',
      visualImg: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
      badge1Icon: <RotateCcw size={12} aria-hidden="true" />,
      badge1Text: '100% Recycled',
      badge2Icon: <Star size={12} fill="currentColor" aria-hidden="true" />,
      badge2Text: '4.9 Rated',
    },
    {
      id: 3,
      themeClass: 'hero-slide-theme-indigo',
      badge: 'Ethical Fashion & Streetwear',
      badgeIcon: <ShoppingBag size={14} style={{ color: 'var(--color-tertiary)' }} />,
      title: (
        <>
          Conscious Fashion. <br />
          <span className="highlight">Zero Compromise.</span>
        </>
      ),
      subtext: 'Plant-dyed hemp apparel, upcycled denim jackets, and cruelty-free vegan footwear curated for modern living.',
      highlights: [
        { icon: <Leaf size={13} />, text: '2.4kg CO₂ Offset/Item' },
        { icon: <Tag size={13} />, text: 'Extra 15% with ECO15' },
      ],
      ctaText: 'Shop Ethical Fashion',
      ctaAction: () => navigateTo('products', { category: 'Apparel' }),
      secondaryText: 'Women & Men Collections',
      secondaryAction: () => navigateTo('women'),
      visualTitle: 'Plant-Dyed Hemp Jacket',
      visualCategory: 'Ethical Streetwear',
      visualImg: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80',
      badge1Icon: <ShieldCheck size={12} aria-hidden="true" />,
      badge1Text: 'Fair Trade Certified',
      badge2Icon: <TrendingUp size={12} aria-hidden="true" />,
      badge2Text: 'Trending Now',
    },
    {
      id: 4,
      themeClass: 'hero-slide-theme-amber',
      badge: 'Verified Green Logistics & Easy Returns',
      badgeIcon: <Truck size={14} style={{ color: 'var(--color-accent)' }} />,
      title: (
        <>
          Doorstep Delivery <br />
          <span className="highlight">& 7-Day Easy Returns.</span>
        </>
      ),
      subtext: 'Shop with full confidence: 6-digit OTP delivery verification, real-time vehicle GPS tracking, and hassle-free reverse QC pickups.',
      highlights: [
        { icon: <ShieldCheck size={13} />, text: 'Cryptographic Delivery PIN' },
        { icon: <Truck size={13} />, text: 'Live Order Tracking' },
      ],
      ctaText: 'Track Your Orders',
      ctaAction: () => navigateTo('order-tracking'),
      secondaryText: 'Explore Catalog',
      secondaryAction: () => navigateTo('products'),
      visualTitle: 'EcoExpress Fleet Tracker',
      visualCategory: 'Net-Zero Logistics',
      visualImg: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
      badge1Icon: <ShieldCheck size={12} aria-hidden="true" />,
      badge1Text: 'OTP Verified',
      badge2Icon: <Truck size={12} aria-hidden="true" />,
      badge2Text: 'Doorstep Pickup',
    },
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    if (!isPaused) {
      timerRef.current = setInterval(nextSlide, 5000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused]);

  return (
    <div
      className="hero-carousel-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="hero-carousel-viewport">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`hero-slide ${slide.themeClass} ${idx === currentSlide ? 'active' : ''}`}
          >
            {/* Left Content */}
            <div className="hero-slide-content">
              <div className="hero-slide-badge">
                {slide.badgeIcon}
                <span>{slide.badge}</span>
              </div>

              <h1 className="hero-slide-title">{slide.title}</h1>

              <p className="hero-slide-subtext">{slide.subtext}</p>

              <div className="hero-slide-highlights">
                {slide.highlights.map((h, hIdx) => (
                  <div key={hIdx} className="hero-slide-highlight-item">
                    {h.icon}
                    <span>{h.text}</span>
                  </div>
                ))}
              </div>

              <div className="hero-slide-actions">
                <button
                  type="button"
                  className="hero-cta-btn"
                  onClick={slide.ctaAction}
                >
                  <span>{slide.ctaText}</span>
                  <ArrowRight size={17} />
                </button>
                <button
                  type="button"
                  className="hero-cta-secondary-btn"
                  onClick={slide.secondaryAction}
                >
                  {slide.secondaryText}
                </button>
              </div>
            </div>

            {/* Right Visual Composition */}
            <div className="hero-slide-visual">
              <div className="hero-visual-card">
                <div className="hero-floating-badge hero-floating-badge-1" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  {slide.badge1Icon}
                  <span>{slide.badge1Text}</span>
                </div>
                <div className="hero-floating-badge hero-floating-badge-2" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  {slide.badge2Icon}
                  <span>{slide.badge2Text}</span>
                </div>

                <div className="hero-visual-img-wrap">
                  <img
                    src={slide.visualImg}
                    alt={slide.visualTitle}
                    className="hero-visual-img"
                    loading="lazy"
                  />
                </div>

                <div className="hero-visual-meta">
                  <span className="hero-visual-title">{slide.visualTitle}</span>
                  <span className="hero-visual-tag">{slide.visualCategory}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Previous & Next Navigation Buttons */}
        <button
          type="button"
          className="hero-nav-arrow hero-nav-arrow-left"
          onClick={prevSlide}
          aria-label="Previous Campaign"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          type="button"
          className="hero-nav-arrow hero-nav-arrow-right"
          onClick={nextSlide}
          aria-label="Next Campaign"
        >
          <ChevronRight size={22} />
        </button>

        {/* Pagination Indicators */}
        <div className="hero-dots-wrap">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`hero-dot ${idx === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroCarousel;

import React from 'react';
import styles from './Navbar.module.css';

const Navbar = () => {
    return (
        <nav className={styles.navbar}>
            <a href="#home" className={styles.brand}>EcoNext</a>
            <div className={styles.links}>
                <a href="#kids" className={styles.link}>Kids</a>
                <a href="#teens" className={styles.link}>Teens</a>
                <a href="#men" className={styles.link}>Men</a>
                <a href="#women" className={styles.link}>Women</a>
                <a href="#unisex" className={styles.link}>Unisex</a>
            </div>
            <div className={styles.auth}>
                <a href="#login" className={styles.link}>Login</a>
                <a href="#signup" className={`${styles.link} ${styles.signup}`}>Sign Up</a>
            </div>
        </nav>
    );
};

export default Navbar;

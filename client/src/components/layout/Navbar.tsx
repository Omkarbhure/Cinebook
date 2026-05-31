'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/context/LocationContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  
  const { user, logout, isAdmin } = useAuth();
  const { city, setCity, availableCities, detectLocation, detecting } = useLocation();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
    setDropdownOpen(false);
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/movies', label: 'Movies' },
    { href: '/cinemas', label: 'Cinemas' },
  ];

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div className="container">
        <div className={styles.inner}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon}>🎬</span>
            <span className={styles.logoText}>Cine<span className={styles.logoAccent}>Book</span></span>
          </Link>

          {/* City Selector */}
          <div className={styles.citySelector}>
            <button className={styles.cityBtn} onClick={() => setCityDropdownOpen(!cityDropdownOpen)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{city || 'Select City'}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginLeft: 4}}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {cityDropdownOpen && (
              <div className={styles.cityDropdown}>
                {/* Detect location option */}
                <button
                  className={styles.cityDetectBtn}
                  onClick={async () => {
                    const result = await detectLocation();
                    if (result.success) {
                      setCityDropdownOpen(false);
                    }
                  }}
                  disabled={detecting}
                >
                  {detecting ? (
                    <><span className={styles.cityDetectSpinner} /> Detecting...</>
                  ) : (
                    <><span>🎯</span> Use My Location</>
                  )}
                </button>
                <div className={styles.cityDivider} />
                {availableCities.map(c => (
                  <button key={c} className={`${styles.cityItem} ${city === c ? styles.cityItemActive : ''}`}
                    onClick={() => { setCity(c); setCityDropdownOpen(false); }}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Nav Links */}
          <div className={styles.navLinks}>
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Search Bar */}
          <div className={styles.searchBar}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input placeholder="Search movies..." className={styles.searchInput}
              onKeyDown={e => { if (e.key === 'Enter') router.push(`/movies?search=${(e.target as HTMLInputElement).value}`); }} />
          </div>

          {/* Auth Section */}
          <div className={styles.authSection}>
            {user ? (
              <div className={styles.userMenu}>
                <button className={styles.avatarBtn} onClick={() => setDropdownOpen(!dropdownOpen)}>
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className={styles.avatarImg} />
                  ) : (
                    <div className={styles.avatarFallback}>{user.name.charAt(0).toUpperCase()}</div>
                  )}
                  <span className={styles.userName}>{user.name.split(' ')[0]}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className={styles.dropdown}>
                    {/* User info header */}
                    <div className={styles.dropdownUser}>
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className={styles.dropdownAvatar} />
                      ) : (
                        <div className={styles.dropdownAvatarFallback}>{user.name.charAt(0).toUpperCase()}</div>
                      )}
                      <div className={styles.dropdownUserInfo}>
                        <span className={styles.dropdownUserName}>{user.name}</span>
                        {user.email && <span className={styles.dropdownUserEmail}>{user.email}</span>}
                      </div>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <Link href="/profile" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                      <span>👤</span> My Profile
                    </Link>
                    <Link href="/profile/bookings" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                      <span>🎟️</span> My Bookings
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                        <span>🛡️</span> Admin Panel
                      </Link>
                    )}
                    <div className={styles.dropdownDivider} />
                    <button className={`${styles.dropdownItem} ${styles.logoutBtn}`} onClick={handleLogout}>
                      <span>🚪</span> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.authButtons}>
                <Link href="/auth/login" className="btn btn-ghost btn-sm">Login</Link>
                <Link href="/auth/register" className="btn btn-primary btn-sm">Sign Up</Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button className={styles.menuBtn} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
              <span className={`${styles.hamburger} ${menuOpen ? styles.open : ''}`}>
                <span /><span /><span />
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className={styles.mobileMenu}>
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
            {!user && (
              <>
                <Link href="/auth/login" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Login</Link>
                <Link href="/auth/register" className="btn btn-primary btn-full" onClick={() => setMenuOpen(false)}>Sign Up</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import ClientLayout from './ClientLayout';
import './admin.css';

const adminDisplay = Space_Grotesk({
    subsets: ['latin'],
    variable: '--font-admin-display'
});

const adminMono = IBM_Plex_Mono({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    variable: '--font-admin-mono'
});

export const metadata = {
    title: 'Bima Sakhi OS | Business Control',
    robots: { index: false, follow: false },
};

export default function Layout({ children }) {
    return (
        <div className={`${adminDisplay.variable} ${adminMono.variable}`}>
            <ClientLayout>{children}</ClientLayout>
        </div>
    );
}

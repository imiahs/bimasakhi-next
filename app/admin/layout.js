import ClientLayout from './ClientLayout';

export const metadata = {
    title: 'Bima Sakhi OS | Business Control',
    robots: { index: false, follow: false },
};

export default function Layout({ children }) {
    return <ClientLayout>{children}</ClientLayout>;
}

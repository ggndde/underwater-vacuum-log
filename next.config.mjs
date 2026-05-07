/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['pdfjs-dist'],
    // Force Vercel to include the pdfjs worker file in the deployment bundle
    outputFileTracingIncludes: {
        '**': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs'],
    },
};

export default nextConfig;

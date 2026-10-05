import type { Metadata } from 'next';import './globals.css';
export const metadata:Metadata={title:'Arena FC | Campeonatos',description:'Organize e dispute campeonatos de EA SPORTS FC 26 e 27.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}

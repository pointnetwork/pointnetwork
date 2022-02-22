// import bootstrap css (installed via npm)
import 'bootstrap/dist/css/bootstrap.css';
import Head from 'next/head';
import '../styles/globals.css';
import NavBar from '../components/navbar';

function App({Component, pageProps}) {
    return (
        <>
            <Head>
                <meta charset="UTF-8"></meta>
                <meta
                    name="viewport"
                    content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0"
                ></meta>
                <meta http-equiv="X-UA-Compatible" content="ie=edge"></meta>
                <title>Point Network Web API</title>
                <link rel="icon" href="images/favicon.ico" />
            </Head>
            <NavBar />
            <Component {...pageProps} />
            <footer className="footer">
                <section class="container text-muted">
                    © Copyright 2020-2021 Point Network Limited · Email:{' '}
                    <a href="mailto:info@pointnetwork.io">info@pointnetwork.io</a>
                </section>
            </footer>
        </>
    );
}

export default App;

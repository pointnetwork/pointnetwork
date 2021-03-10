import 'bootstrap/dist/css/bootstrap.css' // add bootstrap css
// import styles from '../components/layout.module.css'
import Head from "next/head";
import "../styles/globals.css";

function App({ Component, pageProps }) {
    return (
        <>
        <Head>
            <meta charset="UTF-8"></meta>
            <meta name="viewport"
                content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0"></meta>
            <meta http-equiv="X-UA-Compatible" content="ie=edge"></meta>
            <title>Point Network Web API</title>
            <link rel="icon" href="images/favicon.ico" />
        </Head>
        <Component {...pageProps} />
        </>
    )
}

export default App;
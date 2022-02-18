import Image from 'next/image';

export default function navbar() {
    return (
        <nav class="navbar navbar-expand-md navbar-dark bg-dark fixed-top">
            <Image src="/images/round-logo.png" height={35} width={35} alt="logo" />
            <a class="navbar-brand" href="/">
                Point Network Web API
            </a>
            <button
                class="navbar-toggler"
                type="button"
                data-toggle="collapse"
                data-target="#navbarsExampleDefault"
                aria-controls="navbarsExampleDefault"
                aria-expanded="false"
                aria-label="Toggle navigation"
            >
                <span class="navbar-toggler-icon"></span>
            </button>

            <div class="collapse navbar-collapse" id="navbarsExampleDefault">
                <ul class="navbar-nav mr-auto">
                    <li class="nav-item active">
                        <a class="nav-link active" href="/">
                            Home
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/deployments/files">
                            Files
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/deployments/chunks">
                            Chunks
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/deployments/peers">
                            Peers
                        </a>
                    </li>
                </ul>
                <form class="form-inline my-2 my-lg-0">
                    <div class="input-group mb-1">
                        <input
                            type="text"
                            class="form-control"
                            placeholder="Search"
                            aria-label="Search"
                            aria-describedby="basic-addon2"
                        ></input>
                        <div class="input-group-append">
                            <button class="btn btn-outline-success" type="button">
                                Search
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </nav>
    );
}

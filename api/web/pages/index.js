import Layout from '../components/layout'

export default () => (
  <div>
    <nav class="navbar navbar-expand-md navbar-dark bg-dark fixed-top">
      <a class="navbar-brand" href="#">Point Network Web API</a>
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarsExampleDefault" aria-controls="navbarsExampleDefault" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarsExampleDefault">
        <ul class="navbar-nav mr-auto">
          <li class="nav-item active">
              <a class="nav-link" href="#">Home</a>
          </li>
        </ul>
        <form class="form-inline my-2 my-lg-0">
          <div class="input-group mb-1">
            <input type="text" class="form-control" placeholder="Search" aria-label="Search" aria-describedby="basic-addon2"></input>
            <div class="input-group-append">
              <button class="btn btn-outline-success" type="button">Search</button>
            </div>
          </div>
        </form>
      </div>
    </nav>
    <Layout>
        <div>
            <h1>Welcome to Pointnetwork!</h1>
            <p class="lead">Web app utility for Pointnetwork Nodes.</p>
            <h2>Deployer Progress</h2>
            {/* TODO Deployer Progress Component! */}
        </div>
    </Layout>
  </div>
)


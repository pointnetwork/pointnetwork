import Layout from '../components/layout'
import DeployerProgress from '../components/deployer_progress'

export default () => (
  <Layout>
    <div>
      <h1>Welcome to Point Network!</h1>
      <p class="lead">Web Utility for Point Network Nodes.</p>
      <h2>Deployer Progress</h2>
      <DeployerProgress />
    </div>
  </Layout>
)
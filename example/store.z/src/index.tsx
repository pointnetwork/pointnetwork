import React from 'react'
import ReactDom from 'react-dom'
import { App } from './App'

import '~/reset.css'
import '~/assets/css/bootstrap.min.css'
import '~/assets/css/app_theme.css'
import '~/assets/js/bootstrap.min.js'

ReactDom.render(<App />, document.getElementById('root'));

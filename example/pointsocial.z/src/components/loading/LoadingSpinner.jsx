import CircularProgress from '@material-ui/core/CircularProgress';
import Box from '@material-ui/core/Box';

const LoadingSpinner = () => {
    return (
        <>
            <Box sx={{ display: 'flex' }}><CircularProgress /></Box>
        </>
    )
}

export default LoadingSpinner

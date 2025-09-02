import app from './app.js';

app.listen(app.get('port'), () => {
    console.log(app.get('port'), ' port');
});
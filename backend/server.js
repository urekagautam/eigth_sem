
import express from 'express';
const app = express();  
app.get('/', (req, res) => {
  res.send('Sever is ready');
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
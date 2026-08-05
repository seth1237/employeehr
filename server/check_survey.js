const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/elevate').then(async () => {
  const FeedbackSurvey = mongoose.model('FeedbackSurvey', new mongoose.Schema({}, { strict: false }));
  const survey = await FeedbackSurvey.findById('696009fd6d89b8649b48bac1');
  console.log('Survey exists:', survey ? 'YES' : 'NO');
  if (survey) {
    console.log('Survey org_id:', survey.org_id);
    console.log('Survey name:', survey.name);
  }
  
  const allSurveys = await FeedbackSurvey.find({}).limit(5);
  console.log('\nTotal surveys in DB:', allSurveys.length);
  allSurveys.forEach(s => console.log('  -', s._id.toString(), s.name, 'org:', s.org_id));
  
  mongoose.disconnect();
}).catch(err => console.error(err));

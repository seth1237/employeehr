import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/elevate_hr';

// Define FeedbackSurvey schema (inline for seeding)
const feedbackSurveySchema = new mongoose.Schema(
    {
        org_id: { type: String, required: true, index: true },
        name: { type: String, required: true },
        description: { type: String },
        form_config: {
            questions: [
                {
                    field_id: { type: String, required: true },
                    label: { type: String, required: true },
                    type: { type: String, required: true },
                    required: { type: Boolean, default: true },
                    placeholder: { type: String },
                    options: [{ type: String }],
                    order: { type: Number, required: true },
                },
            ],
        },
        public_token: { type: String, unique: true, sparse: true },
        status: {
            type: String,
            enum: ["active", "archived"],
            default: "active",
        },
        created_by: { type: String, required: true },
    },
    { timestamps: true }
);

const FeedbackSurvey = mongoose.model('FeedbackSurvey', feedbackSurveySchema);

const accordOrgId = "6960d00693ecbf6f0dd693ba";
const adminUserId = "system_seed"; // Placeholder for created_by

const surveyData = {
    org_id: accordOrgId,
    name: "360-Degree Feedback Form – Learning & Development",
    description: "This feedback is completely anonymous (except for Line Manager/Supervisor feedback). It is for learning and development only and will not be used for salary, promotion, or appraisal purposes.",
    status: "active",
    created_by: adminUserId,
    form_config: {
        questions: [
            // Section 1: Employee Info
            {
                field_id: "employee_name",
                label: "Name of Employee Being Reviewed",
                type: "text",
                required: true,
                placeholder: "Enter employee name",
                order: 1
            },
            {
                field_id: "employee_department",
                label: "Department / Role of Employee (Optional)",
                type: "text",
                required: false,
                placeholder: "e.g., Marketing, Engineering",
                order: 2
            },
            {
                field_id: "relationship",
                label: "Your Relationship to This Employee",
                type: "select",
                required: true,
                options: [
                    "Line Manager / Supervisor",
                    "Peer / Colleague",
                    "Direct Report",
                    "Internal Customer / Cross-Department"
                ],
                order: 3
            },
            
            // Section 2: Core Competencies - A. Professionalism & Work Ethic
            {
                field_id: "rating_task_completion",
                label: "Completes tasks on time and meets quality standards",
                type: "rating",
                required: true,
                options: ["1", "5"], // min, max
                placeholder: "1 = Needs significant improvement, 5 = Consistently exceptional",
                order: 4
            },
            {
                field_id: "rating_reliability",
                label: "Demonstrates reliability and accountability",
                type: "rating",
                required: true,
                options: ["1", "5"],
                order: 5
            },
            {
                field_id: "rating_compliance",
                label: "Follows company procedures and compliance requirements",
                type: "rating",
                required: true,
                options: ["1", "5"],
                order: 6
            },
            
            // B. Communication & Collaboration
            {
                field_id: "rating_communication",
                label: "Communicates clearly and professionally",
                type: "rating",
                required: true,
                options: ["1", "5"],
                order: 7
            },
            {
                field_id: "rating_teamwork",
                label: "Works effectively in teams and cross-department collaboration",
                type: "rating",
                required: true,
                options: ["1", "5"],
                order: 8
            },
            {
                field_id: "rating_respect",
                label: "Shows respect and professionalism in interactions",
                type: "rating",
                required: true,
                options: ["1", "5"],
                order: 9
            },
            
            // C. Job Knowledge & Execution
            {
                field_id: "rating_role_understanding",
                label: "Demonstrates understanding of his/her role and responsibilities",
                type: "rating",
                required: true,
                options: ["1", "5"],
                order: 10
            },
            {
                field_id: "rating_problem_solving",
                label: "Applies problem-solving and decision-making skills effectively",
                type: "rating",
                required: true,
                options: ["1", "5"],
                order: 11
            },
            {
                field_id: "rating_attention_detail",
                label: "Pays attention to detail and minimizes errors",
                type: "rating",
                required: true,
                options: ["1", "5"],
                order: 12
            },
            
            // D. Ownership & Initiative
            {
                field_id: "rating_ownership",
                label: "Takes ownership of tasks and responsibilities",
                type: "rating",
                required: true,
                options: ["1", "5"],
                order: 13
            },
            {
                field_id: "rating_initiative",
                label: "Shows initiative and proactiveness in solving problems",
                type: "rating",
                required: true,
                options: ["1", "5"],
                order: 14
            },
            {
                field_id: "rating_follow_through",
                label: "Follows through on commitments without constant supervision",
                type: "rating",
                required: true,
                options: ["1", "5"],
                order: 15
            },
            
            // E. Values & Culture Fit
            {
                field_id: "rating_integrity",
                label: "Demonstrates integrity and honesty",
                type: "rating",
                required: true,
                options: ["1", "5"],
                order: 16
            },
            {
                field_id: "rating_values_alignment",
                label: "Aligns actions with Accord values",
                type: "rating",
                required: true,
                options: ["1", "5"],
                order: 17
            },
            {
                field_id: "rating_adaptability",
                label: "Adapts well to change and new challenges",
                type: "rating",
                required: true,
                options: ["1", "5"],
                order: 18
            },
            
            // Section 3: Open-Ended Feedback
            {
                field_id: "strengths",
                label: "What are this employee's key strengths?",
                type: "textarea",
                required: true,
                placeholder: "Provide specific examples of his/her strengths...",
                order: 19
            },
            {
                field_id: "improvement_area",
                label: "What is one area he/she can improve to be more effective?",
                type: "textarea",
                required: true,
                placeholder: "Be constructive and specific...",
                order: 20
            },
            {
                field_id: "start_stop_continue",
                label: "What should this employee start, stop, or continue doing to grow professionally?",
                type: "textarea",
                required: true,
                placeholder: "Start: ...\nStop: ...\nContinue: ...",
                order: 21
            },
            {
                field_id: "team_collaboration",
                label: "How does this employee impact team collaboration and cross-department work?",
                type: "textarea",
                required: true,
                placeholder: "Describe his/her impact on teamwork...",
                order: 22
            },
            {
                field_id: "support_training",
                label: "Is there any support or training you recommend to help this employee grow?",
                type: "textarea",
                required: false,
                placeholder: "Optional: Suggest training, resources, or support...",
                order: 23
            }
        ]
    }
};

async function seedSurvey() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if survey already exists
        const existingSurvey = await FeedbackSurvey.findOne({
            org_id: accordOrgId,
            name: surveyData.name
        });

        if (existingSurvey) {
            console.log('⚠️  Survey already exists for Accord Medical:');
            console.log(`   Survey ID: ${existingSurvey._id}`);
            console.log(`   Name: ${existingSurvey.name}`);
            console.log(`   Questions: ${existingSurvey.form_config.questions.length}`);
            console.log('\n❓ Delete existing and create new? (Ctrl+C to cancel)');
            
            // Wait 3 seconds before proceeding
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            await FeedbackSurvey.deleteOne({ _id: existingSurvey._id });
            console.log('🗑️  Deleted existing survey');
        }

        // Create new survey
        console.log('\n📝 Creating new survey...');
        const survey = new FeedbackSurvey(surveyData);
        await survey.save();

        console.log('\n✅ Successfully seeded 360° Feedback Survey!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 Survey ID: ${survey._id}`);
        console.log(`🏢 Company: Accord Medical (${accordOrgId})`);
        console.log(`📋 Survey Name: ${survey.name}`);
        console.log(`❓ Total Questions: ${survey.form_config.questions.length}`);
        console.log(`📅 Created: ${survey.createdAt}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        console.log('\n📋 Question Breakdown:');
        console.log('   • 3 Employee Info questions');
        console.log('   • 15 Rating questions (1-5 scale)');
        console.log('   • 5 Open-ended feedback questions');
        console.log('   • 23 total questions');
        
        console.log('\n🔗 Next Steps:');
        console.log(`   1. Visit: http://localhost:3000/admin/feedback-360/surveys/${survey._id}`);
        console.log('   2. Create a feedback pool with 5 members');
        console.log('   3. Share the public link with participants');

    } catch (error) {
        console.error('❌ Error seeding survey:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the seeding
seedSurvey();

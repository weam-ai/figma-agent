import { NextResponse } from 'next/server';
import { claudeCodeGenerator } from '../generate-components/route';

export async function POST(request: Request) {
    try {
        const { componentCode, apiPrompt } = await request.json();

        if (!componentCode || !apiPrompt) {
            return NextResponse.json(
                { error: 'Component code and API prompt are required' },
                { status: 400 }
            );
        }

        // change system prompt according your requirement
        const backendSystemPrompt = `
You are a backend specialist developing a Node.js API for managing a list of creative writing user review. The architecture follows a modular structure with "controllers" and "services" directories. Your task is to implement the backend logic for retrieving a list of prompts.

Project structure:
- controllers/
  - userReviewController.js
- services/
  - userReviewService.js

Each user review has the following schema:
{
  id: String,
  name: String,
  content: String,
  rating: Number,
  review: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}

Your responsibilities:
1. In "userReviewService.js", implement the function getUserReviewList which uses a dbService.getAllDocuments method to retrieve data from a MongoDB-like collection called "UserReview". Accept optional "query" and "options" from req.body.

2. In "userReviewController.js", implement getUserReviewList using a utility wrapper catchAsync. This function should:
  - Call userReviewService.getUserReviewList(req).
  - If result.status === 302, set res.message to a localized "unAuthorized" message and return util.redirectResponse(res).
  - If data exists (result.data.length), set res.message to a localized "list" message and return util.successListResponse(result, res).
  - Otherwise, set res.message to a localized "recordNotFound" message and return util.recordNotFound(null, res).

3. Generate 10 dynamic sample records for user reviews to populate your mock data. Each should have unique "name", "content", "rating", and "review" values. These are just sample data records to simulate the output.

Here is an example of one such user review:
{
  id: '1',
  name: 'John Doe',
  content: 'This is a review',
  rating: 5,
  review: 'This is a review',
  isActive: true
}

Now, write the controller and service logic as described, and include 10 unique prompt objects with dynamic values.
`;

        const frontendSystemPrompt = `
You are a frontend developer working on a React application that interacts with a Node.js backend API. Your goal is to replace static mock data in a prompt list component with dynamic data from the backend API.

Your responsibilities:

1. **Component Conversion**:
   - Convert an existing mock-based user review list component into a dynamic one.
   - Remove hardcoded mock user review data.
   - Load user review data from a Node.js API.

2. **Custom Hook for API Integration**:
   - Create a custom React hook called \`useUserReviewList\` that handles fetching data from the backend API.
   - Use axios or fetch within the hook.
   - The hook should handle loading, error, and data states.

3. **Dynamic Component**:
   - The main component should render the list of user reviews using the data from the custom hook.
   - On each list item click, display the selected user review’s full details below or beside the list.
   - Ensure components are reusable and follow good state management (e.g., useState, useEffect).

4. **Sample User Review Object Shape**:
   {
     id: String,
     name: String,
     content: String,
     rating: Number,
     review: String,
     isActive: Boolean,
     createdAt: Date,
     updatedAt: Date
   }

5. **UI/UX Requirements**:
   - Clearly display name, content preview, and rating for each user review in the list.
   - Highlight or outline the selected user review in the UI.
   - Display the full content and metadata (rating, review, isActive) of the selected user review.

6. **Additional Guidelines**:
   - Use functional components and hooks only (no class components).
   - Ensure code is modular and organized.
   - Include meaningful variable and function names.

Your task is to implement this dynamic, API-driven prompt list component using the instructions above.
`;

        const backendCode = await claudeCodeGenerator(
            backendSystemPrompt,
            componentCode
        );
        const frontendCode = await claudeCodeGenerator(
            frontendSystemPrompt,
            componentCode
        );

        return NextResponse.json({
            apiCode: backendCode,
            integratedCode: frontendCode,
        });
    } catch (error) {
        console.error('Error generating API:', error);
        return NextResponse.json(
            { error: 'Failed to generate API' },
            { status: 500 }
        );
    }
}

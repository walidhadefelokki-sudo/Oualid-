import { Router } from 'express';
import {
  sendContactMessage,
  sendCorporateEnquiry,
  sendSupportMessage,
} from '../controllers/contact.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/', sendContactMessage);

// Corporate plan enquiry. Public, and covered by the same hourly rate limit
// as the contact form — it is mounted on /api/contact in app.ts.
router.post('/corporate', sendCorporateEnquiry);

// Support requests come from inside the dashboard, so this one is
// authenticated: support gets the account behind the request rather than only
// whatever address was typed into the form.
router.post('/support', protect, sendSupportMessage);

export default router;

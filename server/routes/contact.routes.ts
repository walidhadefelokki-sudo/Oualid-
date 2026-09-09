import { Router } from 'express';
import {
  sendContactMessage,
  sendCorporateEnquiry,
} from '../controllers/contact.controller';

const router = Router();

router.post('/', sendContactMessage);

// Corporate plan enquiry. Public, and covered by the same hourly rate limit
// as the contact form — it is mounted on /api/contact in app.ts.
router.post('/corporate', sendCorporateEnquiry);

export default router;

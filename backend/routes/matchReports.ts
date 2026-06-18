import express from 'express'
import { createMatchReport, getPendingMatchReport, 
    acceptMatchReport, declineMatchReport} from '../controllers/matchReportController';
import { getMatches } from '../controllers/matchController';
const router = express.Router();

// routes for matchReports
router.post('/match-report', createMatchReport);
router.get('/match-report/pending', getPendingMatchReport);
router.patch('/match-report/:matchReportId/accept', acceptMatchReport);
router.patch('/match-report/:matchReportId/decline', declineMatchReport);

// routes for matches
router.get('/matches', getMatches);

export default router;
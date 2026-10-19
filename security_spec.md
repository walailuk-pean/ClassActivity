# Security Specification for ClassSubmit System

## 1. Data Invariants
1. **Instructors Isolation**: An instructor can only create, edit, or delete courses, student rosters, assignments, and grade submissions belonging to them (`instructorId == request.auth.uid`).
2. **Student Privacy**: Students do not log in. Students cannot list or scrape the whole student roster of any course. They can only query their individual student record (`get` /assignments/{assignmentId}/roster/{studentCode}) by exact matching student code.
3. **Assignment Code Security**: Any student can read the 6-digit `assignment_codes/{code}` lookup document to resolve assignment details, but only the instructor who created the assignment can modify or delete it.
4. **Submission Integrity**:
   - A submission can only be created if the assignment is currently open (or within allowable late window if `allowLate == true`).
   - `studentCode` must be non-empty and well-formed (alphanumeric, max 32 chars).
   - `receiptCode` must be non-empty and follow receipt format.
   - Files are stored in Google Drive via Google Apps Script; Firestore only stores URL string and metadata, preventing Firebase Storage costs.
   - Students cannot tamper with `score`, `feedback`, or `instructorNotes`. Only the course instructor can update grading fields.
   - Submissions can be updated by student only if resubmission is allowed and the assignment is open, and cannot alter existing instructor evaluation.

## 2. The "Dirty Dozen" Threat Payloads
1. **Payload 1 (Roster Bulk Scrape Attack)**: An unauthenticated request tries to `list` all documents in `/courses/{courseId}/students` or `/assignments/{assignmentId}/roster`. Must return `PERMISSION_DENIED`.
2. **Payload 2 (Ghost Field Injection on Submission)**: Student sends submission containing extra privileged field `{ score: 100, isOverridden: true, hacked: true }`. Must return `PERMISSION_DENIED`.
3. **Payload 3 (Score Self-Award Attack)**: Unauthenticated student attempts to `update` `/assignments/{assignmentId}/submissions/{submissionId}` with `{ score: 10 }`. Must return `PERMISSION_DENIED`.
4. **Payload 4 (Closed Assignment Bypass)**: Student submits a file to an assignment where `closeAt` is in the past and `allowLate: false`. Must return `PERMISSION_DENIED`.
5. **Payload 5 (Cross-Instructor Course Theft)**: Authenticated instructor B attempts to edit or delete course belonging to instructor A (`instructorId == instructorA`). Must return `PERMISSION_DENIED`.
6. **Payload 6 (Student Impersonation with Mismatched ID)**: Submitting a document where document ID does not match `studentCode`. Must return `PERMISSION_DENIED`.
7. **Payload 7 (Massive String Buffer Poisoning)**: Student sends `fileName` or `studentName` with 2MB junk text. Must return `PERMISSION_DENIED` by string length boundary check.
8. **Payload 8 (Assignment Code Hijack)**: Unauthenticated user or unauthorized instructor tries to overwrite an existing 6-digit code in `/assignment_codes/{code}`. Must return `PERMISSION_DENIED`.
9. **Payload 9 (Roster Modification by Student)**: Unauthenticated client tries to `setDoc` or `addDoc` to `/assignments/{assignmentId}/roster/{studentCode}`. Must return `PERMISSION_DENIED`.
10. **Payload 10 (Delete Submission by Student)**: Student attempts to delete their submission record after deadline. Must return `PERMISSION_DENIED`.
11. **Payload 11 (Instructor Profile Spoofing)**: Any user attempts to overwrite another instructor's profile in `/instructors/{instructorId}`. Must return `PERMISSION_DENIED`.
12. **Payload 12 (Invalid Receipt Bypass)**: Submission payload without a receipt code or with invalid empty status. Must return `PERMISSION_DENIED`.

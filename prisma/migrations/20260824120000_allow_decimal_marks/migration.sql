-- Question.marks/negativeMarks and Quiz.totalMarks were INT, which silently
-- rejected fractional marks (e.g. 0.5, 1.5) entered by faculty. Widen them to
-- DOUBLE so decimal marks can be stored; totalMarks is a live sum of question
-- marks so it must match.
ALTER TABLE `questions` MODIFY `marks` DOUBLE NOT NULL,
    MODIFY `negative_marks` DOUBLE NOT NULL DEFAULT 0;

ALTER TABLE `quizzes` MODIFY `total_marks` DOUBLE NOT NULL;

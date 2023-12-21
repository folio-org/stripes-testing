import {
  HTML,
  Section,
  including,
  or,
  MultiColumnListRow,
  MultiColumnListCell,
} from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';

const resultSection = Section({ className: 'list-courses' });

const defaultCourse = {
  name: `autotestCourse_${getRandomPostfix()}`,
  departmentId: '4b39d92c-e3b3-4206-a819-fe436a00260a',
  courseListingId: '2cb7df8a-3845-4479-a581-5fefb90a47d9',
};

export default {
  waitLoading: () => {
    cy.expect(
      or(
        resultSection.find(MultiColumnListRow()).exists(),
        resultSection.find(HTML(including('End of list.'))).exists(),
      ),
    );
  },

  verifyExistingCourseIsDisplayed: (courseName) => {
    cy.expect(MultiColumnListCell(courseName).exists());
  },

  openCoursebyListRow(row) {
    cy.do(MultiColumnListRow({ indexRow: `row-${row}` }).click());
  },
  openCourseWithExpectedName(courseName) {
    cy.do(MultiColumnListCell(courseName).click());
  },

  geCourseId: () => {
    // parse hodling record id from current url
    cy.url().then((url) => cy.wrap(url.split('?')[0].split('/').at(-1)).as('CourseRecorId'));
    cy.log("cy.get('@CourseRecorId')" + cy.get('@CourseRecorId'));
    return cy.get('@CourseRecorId');
  },

  deleteCourseViaAPI(courseId) {
    cy.okapiRequest({
      path: `coursereserves/courses/${courseId}`,
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      cy.log('body:' + JSON.stringify(body));
      cy.okapiRequest({
        method: 'DELETE',
        path: `coursereserves/courses/${body.id}`,
        isDefaultSearchParamsRequired: false,
      });
    });
  },

  createCourseViaAPI(courseBody = defaultCourse) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'coursereserves/courses',
        body: courseBody,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body);
  },
};

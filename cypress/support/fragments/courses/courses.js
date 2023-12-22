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
  departmentId: '',
  courseListingId: '',
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

  retrieveDepartmentsViaAPI() {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'coursereserves/departments?limit=500',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body.departments[0]);
  },

  retrieveCourseListingViaAPI() {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'coursereserves/courselistings',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body.courseTypes);
  },

  retrieveCoursesViaAPI() {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'coursereserves/courses?limit=100&query=%28cql.allRecords%3D1%29%20sortby%20name',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body.courses);
  },
};

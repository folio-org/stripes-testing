/**
 * MetaSection interactor
 */
import { isVisible } from 'element-is-visible';
import Accordion from './accordion';

export default Accordion.extend('meta-section')
  .selector('[data-test-meta-section] [data-test-accordion-section]')
  .filters({
    createdText: (el) => el.querySelector('[data-test-created]')?.textContent,
    createdByLink: (el) => el.querySelector('[data-test-created-by] a')?.textContent,
    createdByText: (el) => el.querySelector('[data-test-created-by]')?.textContent,
    updatedText: (el) => el.querySelector('div[class^=metaHeader] div[class^=metaHeaderLabel]')?.textContent,
    updatedByLink: (el) => el.querySelector('[data-test-updated-by] a')?.textContent,
    updatedByText: (el) => el.querySelector('[data-test-updated-by]')?.textContent,
    open: (el) => isVisible(el.querySelector('[class^=content-region]')),
  })
  .actions({
    clickHeader: ({ perform }) => perform((el) => el.querySelector('button').click()),
  });

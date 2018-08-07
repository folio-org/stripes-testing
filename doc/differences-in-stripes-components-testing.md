# Differences in `stripes-components` testing

<!-- md2toc -l 2 differences-in-stripes-components-testing.md -->
* [Waiting on elements instead of delays](#waiting-on-elements-instead-of-delays)
* [Using Karma instead of Nightmare](#using-karma-instead-of-nightmare)
* [Using `@bigtest/mocha` instead of regular Mocha](#using-bigtestmocha-instead-of-regular-mocha)
* [Using `@bigtest/interactor` to provide short-cuts](#using-bigtestinteractor-to-provide-short-cuts)
* [Starting tests with `stripes test`](#starting-tests-with-stripes-test)


The tests for the `stripes-components` library currently differ in several ways from those of the Stripes applications (`ui-users`, etc.). It turns out that these are all orthogonal and can be considered in isolation. We should decide, for each of them, whether to retrofit to the application tests.

This discussion paper is the outcome of an informal break-out meeting on the afternoon of Tuesday 8 May 2018, with Mike Taylor, John Coburn, Matt Jones and Zak Burke.


## Waiting on elements instead of delays

The application tests are full of sequences like the following (from [`ui-users/test/ui-testing/new_proxy.js`](https://github.com/folio-org/ui-users/blob/bd97d96a23012ef1c9ab3cb14b1f55a97f395c2f/test/ui-testing/new_proxy.js#L28-L30)):

	.click('#clickable-users-module')
	.wait(1000)
	.click('#clickable-filter-pg-faculty')

This waits for a fixed period of 1000 ms for the results of the first click to take place before attempting the second click, which is both slow and unreliable: it will fail if, for some reason, it takes more than a second for the click to take effect.

Instead, the stripes-component tests wait for the required element to become available:

	.click('#clickable-users-module')
	.wait('#clickable-filter-pg-faculty')
	.click('#clickable-filter-pg-faculty')

There is no reason why the application tests should not be using this form, in at least most cases. (There may be some specific difficult cases where timed delays are necessary; these should be considered on their merits.)


## Using Karma instead of Nightmare

Karma and Nightmare are two different browser automation libraries. We started out using Nightmare and have not yet found a sufficiently compelling reason to go through the pain of switching. But there seems to be an increasing tide of pro-Karma sentiment, largely because it can run its automations in multiple real browsers, whereas Nightmare always uses Electron.

It's probably worth having a wider discussion about switching to Karma.


## Using `@bigtest/mocha` instead of regular Mocha

[`@bigtestjs/mocha`](https://github.com/bigtestjs/mocha) is Frontside's derivative of the standard Mocha test-running library. It differs from the parent package in repeatedly polling each test until it becomes true, or until an implicit timeout expires. (They call this approach "convergent assertion".)

On the positive side, this allows `.wait` actions to be omitted altogether. On the negative side, it introduces some surprises if any test inadvertently contains anything that changes state, as that state-change will be executed an indeterminate number of times.

I'm not convinced that the unpredictable cost of this approach is necessarily worth the gain. We can consider whether to shift to using `@bigtest/mocha`, but it's not an obvious move.


## Using `@bigtest/interactor` to provide short-cuts

[`@bigtestjs/interactor`](https://github.com/bigtestjs/interactor) is another part of Frontside's "BigTest" suite, providing useful short-cuts for some browser automation sequences, and the ability to define and use re-usable "macros".

This looks like a powerful way to build tests of UIs, and may well be worth adopting: see the `logIn` example at the start of [the top-level README](https://github.com/bigtestjs/interactor/blob/master/README.md).

But using interactors requires the "convergent" style and so may imply or necessitate the use of `@bigtest/mocha`. Also, it may require using Karma instead of Nightmare, which is a switch we may not want to make -- or not yet.

(But perhaps it's possible to do a similar kind of thing directly on top of Nightmare? Worth looking into.)


## Starting tests with `stripes test`

At present, application tests are launched (by `yarn test` in the `ui-testing` package) using the Mocha command-line script. By contrast, the `stripes-components` tests are launched using the Stripes CLI, as `stripes test karma`. This does other things, such as setting up a temporary Stripes service for the tests to run against.

There is an irony here, in that the `stripes-components` tests are the only ones that do _not_ run against Stripes, so that setting up a service is a waste of time in this context. But this facility _would_ perhaps be of value in all the contexts that presently do _not_ use it.

However, much of the while, we want to explicitly specify which Stripes installation we're running the tests against -- a running local development Stripes, the public `stripes-testing` service, or whatever. So it may be that using `stripes test` would not give us much in most contexts.



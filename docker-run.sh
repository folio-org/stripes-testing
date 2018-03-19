#!/bin/bash

set -e
set -x

/usr/bin/Xvfb :2 &
sleep 0.5
DISPLAY=:2 yarn test


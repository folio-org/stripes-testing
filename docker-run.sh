#!/bin/bash

set -e
set -x

/usr/bin/Xvfb :1 &
sleep 1
DISPLAY=:1 yarn test

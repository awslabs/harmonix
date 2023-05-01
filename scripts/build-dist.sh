#!/bin/bash

###########
# This file will build a zip file containing the contents of the repository
# It will ignore files specified in .gitignore and will also exclude files
# listed in the .gitattributes file at the root of the repo
#
# See git archive documentation and .gitattributes documentation for more details
# - https://git-scm.com/docs/git-archive
# - https://git-scm.com/docs/gitattributes
###########
git archive --worktree-attributes --prefix ${PWD##*/}/ HEAD -o ./dist/${PWD##*/}-$(date "+%Y%m%d").zip
#! /usr/bin/env bash

# TODO: make thie more modular -- operate within a single lambda code folder
# without making any assumptions about the git repo or higher level structure

resource="$1"
if [ -z "$resource" ]; then
  echo "Please provide resource name. E.g., StreamAnalyzer" >&2
  exit 1
fi

root=$(git rev-parse --show-toplevel)
zipfile=build/lambda/$resource.zip

# TODO: also ensure git repo is the correct one

if [ "$(pwd)" != "$root" ]; then
  echo "Lambda deploy must be run from git root" >&2
  exit 1
fi

function_name=( $(deploy/util/list_function_names.rb | grep $resource) )

if [ -z "$function_name" ]; then
  echo "Could not obtain name of $resource lambda function." >&2
  exit 1
elif [ -n "${function_name[1]}" ]; then
  echo "Multilple matches found; this script doesn't support that condition yet" >&2
  for name in "${function_name[@]}"; do
    echo $name >&2
  done
  exit 1
fi

mkdir -p build/lambda

echo "rm build/lambda/$resource.zip" >&2
[ -f "build/lambda/$resource.zip" ] && rm build/lambda/$resource.zip

echo "pushd lambda/$resource/" >&2
pushd lambda/$resource/ || (echo "failed" >&2 && exit 1)

echo "zip -r ../../build/lambda/$resource ./*" >&2
zip -r ../../$zipfile ./*  || (echo "failed" >&2 && exit 1)

echo "popd" >&2
popd

echo "Updating lambda code" >&2
aws lambda update-function-code --function-name $function_name --zip-file fileb://$root/$zipfile

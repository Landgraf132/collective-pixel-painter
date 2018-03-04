#!/bin/bash
find . -name '*' | sort |  while read A ; 
do 
./canvasDataToPng $A
done
 

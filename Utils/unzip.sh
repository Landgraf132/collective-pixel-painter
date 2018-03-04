#!/bin/bash
counter=0
find . -name '*.tar.gz' | sort | while read A ; 
do 
tar xfvz $A
let "counter=counter+1"
mv canvas.data data/$counter
echo $(basename "$A" \.vala ) ;
done

#!/bin/bash
# sheet.sh in.png out.png n  -> n vertical strips side by side, each 1800px tall
in=$1; out=$2; n=$3
read W H < <(ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=p=0 "$in" | tr ',' ' ')
s=$((H / n)); f=""; l=""
for i in $(seq 0 $((n-1))); do f="$f[0:v]crop=$W:$s:0:$((i*s)),scale=-2:1800[s$i];"; l="$l[s$i]"; done
ffmpeg -v error -y -i "$in" -filter_complex "${f}${l}hstack=inputs=$n" "$out"

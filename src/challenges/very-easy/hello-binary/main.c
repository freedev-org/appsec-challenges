#include <stdio.h>

int main(void)
{
    char name[32];

    fputs("Digite seu nome: ", stdout);
    scanf("%s", name);

    printf("Opa, %s! Como vai?", name);
    return 0;
}
